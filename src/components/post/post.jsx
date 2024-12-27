import React, { useState, useEffect } from 'react';
import styles from './post.module.css';
import { useNavigate, useParams } from 'react-router-dom';
import panda from '../../img/panda.png';
import heartFull from '../../img/Heart(red).png';
import heartEmpty from '../../img/Heart(empty).png';
import headimg from '../../img/head.jpg';
import axios from 'axios';

const PostPage = () => {
  const { id } = useParams(); // URL 파라미터로부터 게시물 ID 가져오기
  const navigate = useNavigate();
  const [requestData, setRequestData] = useState(null); // 서버에서 가져온 데이터
  const [isLiked, setIsLiked] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [newQuestion, setNewQuestion] = useState('');
  const [newReply, setNewReply] = useState('');
  const [loading, setLoading] = useState(true);

  // 기본 데이터 설정
  const defaultData = {
    userName: "익명 사용자",
    title: "기본 제목",
    description: "데이터를 불러오는 데 실패했습니다. 기본 데이터를 표시합니다.",
    payment: { serviceFee: 0 },
    QnA: [],
  };

  // 서버에서 게시물 데이터 가져오기
  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('authToken'); // 토큰 가져오기
        const response = await axios.get(`http://127.0.0.1:8080/order/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = response.data.data; // 백엔드의 데이터 구조에 맞게 수정
        setRequestData(data);
        setIsLiked(data.isLiked || false);
        setQuestions(data.QnA || []);
      } catch (error) {
        console.error('게시물 데이터를 가져오는 데 실패했습니다:', error.response?.data || error.message);
        if (error.response?.status === 401) {
          alert('인증이 필요합니다. 로그인 페이지로 이동합니다.');
          navigate('/login'); // 로그인 페이지로 리다이렉트
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, navigate]);

  // requestData가 없으면 기본 데이터 사용
  const displayedData = requestData || defaultData;

  const toggleLike = async () => {
    const updatedLikeStatus = !isLiked; // 상태 반전
    setIsLiked(updatedLikeStatus); // 로컬 상태 먼저 반영

    try {
      const token = localStorage.getItem('authToken'); // 토큰 가져오기
      await axios.patch(`http://127.0.0.1:8080/order/${id}`, {
        action: updatedLikeStatus ? 'addFavorite' : 'removeFavorite',
      }, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    } catch (error) {
      console.error('좋아요 상태 저장 실패:', error);
      setIsLiked(!updatedLikeStatus); // 서버 요청 실패 시 원래 상태로 되돌림
    }
  };

  const handleQuestionAction = async (action, questionData = {}) => {
    try {
      const token = localStorage.getItem('authToken'); // 토큰 가져오기
      const response = await axios.patch(`http://127.0.0.1:8080/order/${id}`, {
        action,
        ...questionData,
      }, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setQuestions(response.data.QnA);
    } catch (error) {
      console.error(`${action} 처리 중 오류 발생:`, error);
    }
  };

  const addQuestion = async () => {
    if (newQuestion.trim() !== '') {
      const questionData = {
        _id: Date.now().toString(), // 임시 ID 생성
        user_Id: "현재 사용자",
        content: newQuestion,
        answers: [],
      };

      // 로컬 상태 먼저 업데이트
      setQuestions([...questions, questionData]);
      setNewQuestion(''); // 입력 필드 초기화

      try {
        const token = localStorage.getItem('authToken'); // 토큰 가져오기
        const response = await axios.patch(`http://127.0.0.1:8080/order/${id}`, {
          action: 'addQuestion',
          question: { content: newQuestion },
        }, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setQuestions(response.data.QnA); // 서버 응답으로 상태 동기화
      } catch (error) {
        console.error('질문 추가 실패:', error);
        alert('서버와의 동기화에 실패했습니다.');
      }
    }
  };

  // 질문 수정
  const updateQuestion = async (questionId, updatedContent) => {
    setQuestions(prevQuestions => 
        prevQuestions.map(q => q.id === questionId ? { ...q, text: updatedContent } : q)
    ); // 로컬 상태 업데이트

    try {
        await handleQuestionAction('updateQuestion', {
            questionId,
            question: { content: updatedContent },
        });
    } catch (error) {
        console.error('질문 수정 실패:', error);
        alert('질문 수정에 실패했습니다. 다시 시도해주세요.');
    }
  };

  // 질문 삭제
  const deleteQuestion = async (questionId) => {
    setQuestions(prevQuestions => 
        prevQuestions.filter(q => q.id !== questionId)
    ); // 로컬 상태에서 삭제

    try {
        await handleQuestionAction('deleteQuestion', { questionId });
    } catch (error) {
        console.error('질문 삭제 실패:', error);
        alert('질문 삭제에 실패했습니다. 다시 시도해주세요.');
    }
  };

  const addReply = async (questionId) => {
    if (newReply.trim() !== '') {
      // 이미 댓글을 단 질문인지 확인
      const questionIndex = questions.findIndex((q) => q._id === questionId);
      if (questions[questionIndex]?.hasReplied){
        return
      }
      const replyData = {
        _id: Date.now().toString(),
        user_Id: "현재 사용자",
        content: newReply,
      };

      // 로컬 상태 먼저 업데이트
      setQuestions(
        questions.map((q) =>
          q._id === questionId
            ? { ...q, answers: [...q.answers, replyData], hasReplied: true }
            : q
        )
      );
      setNewReply(''); // 입력 필드 초기화

      try {
        const token = localStorage.getItem('authToken'); // 토큰 가져오기
        const response = await axios.patch(`http://127.0.0.1:8080/order/${id}`, {
          action: 'addAnswer',
          questionId,
          answer: { content: newReply },
        }, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setQuestions(response.data.QnA); // 서버 응답으로 상태 동기화
      } catch (error) {
        console.error('답글 추가 실패:', error);
        alert('서버와의 동기화에 실패했습니다.');
      }
    }
  };

  // 답글 수정
  const updateReply = async (questionId, replyId, updatedContent) => {
    setQuestions(prevQuestions =>
        prevQuestions.map(q =>
            q._id === questionId
                ? {
                      ...q,
                      replies: q.replies.map(r =>
                          r.id === replyId ? { ...r, text: updatedContent } : r
                      ),
                  }
                : q
        )
    ); // 로컬 상태 업데이트

    try {
        await handleQuestionAction('updateAnswer', {
            questionId,
            answerId: replyId,
            answer: { content: updatedContent },
        });
    } catch (error) {
        console.error('답글 수정 실패:', error);
        alert('답글 수정에 실패했습니다. 다시 시도해주세요.');
    }
  };

  // 답글 삭제
  const deleteReply = async (questionId, replyId) => {
    setQuestions(prevQuestions =>
        prevQuestions.map(q =>
            q.id === questionId
                ? {
                      ...q,
                      replies: q.replies.filter(r => r.id !== replyId),
                  }
                : q
        )
    ); // 로컬 상태에서 삭제

    try {
        await handleQuestionAction('deleteAnswer', {
            questionId,
            answerId: replyId,
        });
    } catch (error) {
        console.error('답글 삭제 실패:', error);
        alert('답글 삭제에 실패했습니다. 다시 시도해주세요.');
    }
  };

  if (loading) {
    return <div>데이터를 불러오는 중입니다...</div>;
  }

  

  return (
    <div className={styles.app}>
      <div className={styles.topBanner}>
        <button className={styles.backArrow} onClick={() => navigate(-1)}>
          ←
        </button>
        <img src={headimg} alt="배경 이미지" className={styles.bannerImg} />
      </div>

      <header className={styles.header}>
        <img src={panda} alt="프로필" className={styles.profileImg} />
        <div className={styles.userInfo}>
          <span className={styles.userName}>{displayedData.userName || '익명 사용자'}</span>
          <span className={styles.userDistance}>1km 내외</span>
        </div>
        <button className={styles.likeBtn} onClick={toggleLike}>
          <img src={isLiked ? heartFull : heartEmpty} alt="찜 버튼" className={styles.likeIcon} />
        </button>
      </header>

      <main className={styles.content}>
        <h3>{displayedData.title || '제목 없음'}</h3>
        <p>{displayedData.description || '내용 없음'}</p>
        <p>금액: {displayedData.payment?.serviceFee || 0} 원</p>
      </main>

      <section className={styles.qna}>
        <h3>Q&A</h3>
        {questions.map((q) => (
          <div key={q._id} className={styles.qnaItem}>
            <div className={styles.question}>
              <span>{q.user_Id || '익명 사용자'}:</span>
              <p>{q.content}</p>
              <button onClick={() => updateQuestion(q._id, '수정된 질문 내용')} className={styles.button}>
                질문 수정
              </button>
              <button onClick={() => deleteQuestion(q._id)} className={styles.button}>
                질문 삭제
              </button>
            </div>
            {q.answers.map((r, index) => (
              <div key={index} className={styles.reply}>
                <span>{r.user_Id || '익명 사용자'}:</span>
                <p>{r.content}</p>
                <button
                  onClick={() => updateReply(q._id, r._id, '수정된 답글 내용')}
                  className={styles.button}
                >
                  답글 수정
                </button>
                <button
                  onClick={() => deleteReply(q._id, r._id)}
                  className={styles.button}
                >
                  답글 삭제
                </button>
              </div>
            ))}
            <div className={styles.replyInput}>
              <input
                type="text"
                placeholder="답글 작성..."
                value={newReply}
                onChange={(e) => setNewReply(e.target.value)}
                className={styles.input}
                disabled={q.hasReplied}
              />
              <button onClick={() => addReply(q._id)} className={styles.button} disabled={q.hasR}>
                댓글 달기
              </button>
            </div>
          </div>
        ))}

        <div className={styles.questionInput}>
          <input
            type="text"
            placeholder="질문을 입력하세요..."
            value={newQuestion}
            onChange={(e) => setNewQuestion(e.target.value)}
            className={styles.input}
          />
          <button onClick={addQuestion} className={styles.button}>
            질문하기
          </button>
        </div>
      </section>
    </div>
  );
};

export default PostPage;
