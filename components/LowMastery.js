import { useEffect, useState } from "react";

 
export default function LowMastery() {
  const [words, setWords] = useState([]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    fetch("http://192.168.0.106:8000/api/words/low_mastery/")
      .then((res) => res.json())
      .then((data) => setWords(data))
      .catch((err) => console.error(err));
  }, []);

  if (words.length === 0) return <div>Loading words...</div>;

  const total = words.length;
  const word = words[index];

  

  const jumpTo = (e) => {
    const id = parseInt(e.target.value) - 1;
    if (!isNaN(id) && id >= 0 && id < total) setIndex(id);
  };

  return (
<div className=" bg-white rounded-xl shadow-md p-6 w-full max-w-4xl mx-auto mt-4 relative text-left max-w-2xl mx-auto bg-white p-6 rounded shadow space-y-4 ">
      <div className="absolute top-2 right-2 rounded-full bg-blue-200 text-blue-900 font-bold text-sm px-3 py-1">
        ID: {word}
      </div>
</div>
   );
}
